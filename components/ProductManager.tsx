
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { Plus, Search, Edit2, Trash2, Loader2, Package } from 'lucide-react';
import { ProductFormModal } from './ProductFormModal';

export const ProductManager: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name');

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (product: Product) => {
        setProductToEdit(product);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setProductToEdit(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Erro ao excluir produto. Verifique se não há vendas vinculadas.');
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-[#1C1C1E] rounded-xl shadow-sm border border-white/10 flex flex-col h-[600px] animate-fade-in">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#1C1C1E] rounded-t-xl">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Package className="text-[#FFCC00]" />
                        Gerenciar Produtos
                    </h2>
                    <p className="text-sm text-gray-400">Cadastre, edite ou remova itens do cardápio</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-[#FFCC00] text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#E5B800] transition-colors shadow-lg"
                >
                    <Plus size={20} />
                    Novo Produto
                </button>
            </div>

            {/* Toolbar */}
            <div className="p-4 bg-[#1C1C1E] border-b border-white/10">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar produto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[#2C2C2E] border-none rounded-lg focus:ring-2 focus:ring-[#FFCC00] outline-none text-white placeholder-gray-500"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-0">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="animate-spin text-[#FFCC00]" size={40} />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Package size={48} className="mb-4 opacity-20" />
                        <p>Nenhum produto encontrado.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#2C2C2E] sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                            <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-white/5">
                                <th className="py-3 px-6 font-medium text-center">#</th>
                                <th className="py-3 px-6 font-medium">Nome</th>
                                <th className="py-3 px-6 font-medium">Categoria</th>
                                <th className="py-3 px-6 font-medium">Preço</th>
                                <th className="py-3 px-6 font-medium text-center">Disponível</th>
                                <th className="py-3 px-6 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-white/5 bg-[#1C1C1E]">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-[#2C2C2E] transition-colors duration-200 group">
                                    <td className="py-3 px-6 border-b border-white/5 font-medium text-center text-gray-400">{product.menu_number === 13 ? '12+1' : (product.menu_number || '-')}</td>
                                    <td className="py-3 px-6 border-b border-white/5 font-medium text-gray-200">{product.name}</td>
                                    <td className="py-3 px-6 border-b border-white/5">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize
                      ${product.category === 'xis' ? 'bg-yellow-900/20 text-yellow-400' :
                                                product.category === 'dog' ? 'bg-orange-900/20 text-orange-400' :
                                                    product.category === 'bebida' ? 'bg-blue-900/20 text-blue-400' :
                                                        'bg-gray-800 text-gray-300'}`}>
                                            {product.category}
                                        </span>
                                    </td>
                                    <td className="py-3 px-6 border-b border-white/5 font-bold text-gray-200">R$ {product.price.toFixed(2)}</td>
                                    <td className="py-3 px-6 border-b border-white/5 text-center">
                                        <div className={`w-3 h-3 rounded-full mx-auto ${product.is_available ? 'bg-green-500' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                                    </td>
                                    <td className="py-3 px-6 border-b border-white/5 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id)}
                                                className="p-2 text-yellow-500 hover:bg-yellow-900/20 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <ProductFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                productToEdit={productToEdit}
                onSuccess={fetchProducts}
            />
        </div>
    );
};
