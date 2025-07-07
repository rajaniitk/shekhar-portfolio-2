import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import plotly.figure_factory as ff
from scipy import stats
import base64
import io
import os

class Visualizations:
    def __init__(self):
        self.plot_counter = 0
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
    
    def generate_eda_plots(self, df: pd.DataFrame, session_id: str) -> dict:
        """Generate comprehensive EDA visualizations"""
        plots = {}
        
        # Dataset overview
        plots['overview'] = self._create_overview_plots(df, session_id)
        
        # Correlation heatmap
        plots['correlation'] = self._create_correlation_heatmap(df, session_id)
        
        # Distribution plots
        plots['distributions'] = self._create_distribution_plots(df, session_id)
        
        # Missing values visualization
        plots['missing_values'] = self._create_missing_values_plot(df, session_id)
        
        # Categorical analysis
        plots['categorical'] = self._create_categorical_plots(df, session_id)
        
        return plots
    
    def _create_overview_plots(self, df: pd.DataFrame, session_id: str) -> dict:
        """Create overview plots"""
        plots = {}
        
        # Data types distribution
        dtype_counts = df.dtypes.value_counts()
        fig = px.pie(
            values=dtype_counts.values,
            names=[str(x) for x in dtype_counts.index],
            title="Data Types Distribution"
        )
        plots['data_types'] = self._save_plotly_figure(fig, f"{session_id}_data_types")
        
        # Missing values summary
        missing_counts = df.isnull().sum()
        missing_counts = missing_counts[missing_counts > 0].sort_values(ascending=False)
        
        if len(missing_counts) > 0:
            fig = px.bar(
                x=missing_counts.index,
                y=missing_counts.values,
                title="Missing Values by Column"
            )
            fig.update_layout(xaxis_title="Columns", yaxis_title="Missing Count")
            plots['missing_summary'] = self._save_plotly_figure(fig, f"{session_id}_missing_summary")
        
        return plots
    
    def _create_correlation_heatmap(self, df: pd.DataFrame, session_id: str) -> dict:
        """Create correlation heatmap"""
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.shape[1] < 2:
            return {'message': 'Not enough numeric columns for correlation analysis'}
        
        # Pearson correlation
        corr_matrix = numeric_df.corr()
        
        fig = px.imshow(
            corr_matrix,
            text_auto=True,
            aspect="auto",
            title="Pearson Correlation Matrix",
            color_continuous_scale='RdBu'
        )
        
        pearson_plot = self._save_plotly_figure(fig, f"{session_id}_pearson_corr")
        
        # Spearman correlation
        spearman_corr = numeric_df.corr(method='spearman')
        
        fig = px.imshow(
            spearman_corr,
            text_auto=True,
            aspect="auto",
            title="Spearman Correlation Matrix",
            color_continuous_scale='RdBu'
        )
        
        spearman_plot = self._save_plotly_figure(fig, f"{session_id}_spearman_corr")
        
        return {
            'pearson': pearson_plot,
            'spearman': spearman_plot
        }
    
    def _create_distribution_plots(self, df: pd.DataFrame, session_id: str) -> dict:
        """Create distribution plots for numeric columns"""
        numeric_columns = df.select_dtypes(include=[np.number]).columns
        plots = {}
        
        for col in numeric_columns:
            col_plots = {}
            
            # Histogram
            fig = px.histogram(df, x=col, nbins=30, title=f"Distribution of {col}")
            col_plots['histogram'] = self._save_plotly_figure(fig, f"{session_id}_{col}_hist")
            
            # Box plot
            fig = px.box(df, y=col, title=f"Box Plot of {col}")
            col_plots['boxplot'] = self._save_plotly_figure(fig, f"{session_id}_{col}_box")
            
            # Q-Q plot
            fig = self._create_qq_plot(df[col], col)
            col_plots['qqplot'] = self._save_plotly_figure(fig, f"{session_id}_{col}_qq")
            
            plots[col] = col_plots
        
        return plots
    
    def _create_missing_values_plot(self, df: pd.DataFrame, session_id: str) -> dict:
        """Create missing values visualization"""
        missing_matrix = df.isnull()
        
        if not missing_matrix.any().any():
            return {'message': 'No missing values found'}
        
        # Missing values heatmap
        fig = px.imshow(
            missing_matrix.astype(int),
            title="Missing Values Pattern",
            color_continuous_scale=['white', 'red'],
            labels={'color': 'Missing'}
        )
        
        heatmap_plot = self._save_plotly_figure(fig, f"{session_id}_missing_heatmap")
        
        # Missing values bar chart
        missing_counts = df.isnull().sum()
        missing_counts = missing_counts[missing_counts > 0].sort_values(ascending=False)
        
        fig = px.bar(
            x=missing_counts.index,
            y=missing_counts.values,
            title="Missing Values Count by Column"
        )
        
        bar_plot = self._save_plotly_figure(fig, f"{session_id}_missing_bar")
        
        return {
            'heatmap': heatmap_plot,
            'bar_chart': bar_plot
        }
    
    def _create_categorical_plots(self, df: pd.DataFrame, session_id: str) -> dict:
        """Create plots for categorical columns"""
        categorical_columns = df.select_dtypes(include=['object', 'category']).columns
        plots = {}
        
        for col in categorical_columns:
            col_plots = {}
            
            # Value counts
            value_counts = df[col].value_counts().head(20)  # Top 20 categories
            
            fig = px.bar(
                x=value_counts.index,
                y=value_counts.values,
                title=f"Value Counts for {col}"
            )
            fig.update_layout(xaxis_title=col, yaxis_title="Count")
            col_plots['value_counts'] = self._save_plotly_figure(fig, f"{session_id}_{col}_counts")
            
            # Pie chart (if not too many categories)
            if df[col].nunique() <= 10:
                fig = px.pie(
                    values=value_counts.values,
                    names=value_counts.index,
                    title=f"Distribution of {col}"
                )
                col_plots['pie_chart'] = self._save_plotly_figure(fig, f"{session_id}_{col}_pie")
            
            plots[col] = col_plots
        
        return plots
    
    def generate_column_plots(self, df: pd.DataFrame, column: str, session_id: str, 
                            analysis_type: str = 'univariate') -> dict:
        """Generate plots for specific column analysis"""
        plots = {}
        
        if column not in df.columns:
            return {'error': f'Column {column} not found'}
        
        if pd.api.types.is_numeric_dtype(df[column]):
            plots.update(self._create_numeric_column_plots(df, column, session_id))
        else:
            plots.update(self._create_categorical_column_plots(df, column, session_id))
        
        return plots
    
    def _create_numeric_column_plots(self, df: pd.DataFrame, column: str, session_id: str) -> dict:
        """Create plots for numeric column"""
        plots = {}
        
        # Histogram with KDE
        fig = go.Figure()
        fig.add_trace(go.Histogram(x=df[column], nbinsx=30, name='Histogram', opacity=0.7))
        
        # Add KDE curve
        try:
            kde_x = np.linspace(df[column].min(), df[column].max(), 100)
            kde_y = stats.gaussian_kde(df[column].dropna())(kde_x)
            # Scale KDE to match histogram
            kde_y = kde_y * len(df[column].dropna()) * (df[column].max() - df[column].min()) / 30
            
            fig.add_trace(go.Scatter(x=kde_x, y=kde_y, mode='lines', name='KDE', 
                                   line=dict(color='red', width=2)))
        except:
            pass
        
        fig.update_layout(title=f'Distribution of {column}', xaxis_title=column, yaxis_title='Frequency')
        plots['histogram_kde'] = self._save_plotly_figure(fig, f"{session_id}_{column}_hist_kde")
        
        # Box plot with outliers
        fig = px.box(df, y=column, title=f'Box Plot of {column}')
        plots['boxplot'] = self._save_plotly_figure(fig, f"{session_id}_{column}_detailed_box")
        
        # Violin plot
        fig = px.violin(df, y=column, title=f'Violin Plot of {column}')
        plots['violin'] = self._save_plotly_figure(fig, f"{session_id}_{column}_violin")
        
        return plots
    
    def _create_categorical_column_plots(self, df: pd.DataFrame, column: str, session_id: str) -> dict:
        """Create plots for categorical column"""
        plots = {}
        
        value_counts = df[column].value_counts()
        
        # Bar chart
        fig = px.bar(x=value_counts.index, y=value_counts.values, 
                    title=f'Value Counts for {column}')
        plots['bar_chart'] = self._save_plotly_figure(fig, f"{session_id}_{column}_detailed_bar")
        
        # Pie chart
        fig = px.pie(values=value_counts.values, names=value_counts.index, 
                    title=f'Distribution of {column}')
        plots['pie_chart'] = self._save_plotly_figure(fig, f"{session_id}_{column}_detailed_pie")
        
        return plots
    
    def generate_comparison_plots(self, df: pd.DataFrame, columns: list, session_id: str) -> dict:
        """Generate comparison plots between columns"""
        plots = {}
        
        if len(columns) < 2:
            return {'error': 'At least 2 columns required for comparison'}
        
        # Pairwise scatter plots for numeric columns
        numeric_cols = [col for col in columns if pd.api.types.is_numeric_dtype(df[col])]
        
        if len(numeric_cols) >= 2:
            # Pairplot
            fig = self._create_pairplot(df[numeric_cols], session_id)
            plots['pairplot'] = fig
            
            # Correlation scatter plots
            for i in range(len(numeric_cols)):
                for j in range(i+1, len(numeric_cols)):
                    col1, col2 = numeric_cols[i], numeric_cols[j]
                    
                    fig = px.scatter(df, x=col1, y=col2, 
                                   title=f'{col1} vs {col2}',
                                   trendline='ols')
                    plots[f'{col1}_vs_{col2}'] = self._save_plotly_figure(
                        fig, f"{session_id}_{col1}_{col2}_scatter")
        
        return plots
    
    def generate_transformation_comparison(self, original_df: pd.DataFrame, 
                                        transformed_df: pd.DataFrame, 
                                        column: str, session_id: str) -> dict:
        """Generate before/after transformation comparison plots"""
        plots = {}
        
        if column not in original_df.columns:
            return {'error': f'Column {column} not found in original dataframe'}
        
        # Before/after histogram comparison
        fig = make_subplots(rows=1, cols=2, subplot_titles=('Before', 'After'))
        
        # Before
        fig.add_trace(go.Histogram(x=original_df[column], nbinsx=30, name='Before'), row=1, col=1)
        
        # After (check if column still exists or was transformed)
        if column in transformed_df.columns:
            fig.add_trace(go.Histogram(x=transformed_df[column], nbinsx=30, name='After'), row=1, col=2)
        else:
            # Find likely transformed column
            possible_cols = [col for col in transformed_df.columns if column in col]
            if possible_cols:
                fig.add_trace(go.Histogram(x=transformed_df[possible_cols[0]], nbinsx=30, name='After'), row=1, col=2)
        
        fig.update_layout(title=f'Transformation Comparison: {column}')
        plots['comparison'] = self._save_plotly_figure(fig, f"{session_id}_{column}_transformation")
        
        # Statistics comparison
        if column in original_df.columns and column in transformed_df.columns:
            stats_comparison = self._create_stats_comparison(
                original_df[column], transformed_df[column], column, session_id)
            plots.update(stats_comparison)
        
        return plots
    
    def _create_qq_plot(self, series: pd.Series, column_name: str) -> go.Figure:
        """Create Q-Q plot for normality assessment"""
        clean_series = series.dropna()
        
        if len(clean_series) < 3:
            fig = go.Figure()
            fig.add_annotation(text="Insufficient data for Q-Q plot", 
                             x=0.5, y=0.5, showarrow=False)
            return fig
        
        # Generate Q-Q plot data
        sorted_data = np.sort(clean_series)
        theoretical_quantiles = stats.norm.ppf(np.linspace(0.01, 0.99, len(sorted_data)))
        
        fig = go.Figure()
        
        # Add scatter plot
        fig.add_trace(go.Scatter(
            x=theoretical_quantiles, 
            y=sorted_data,
            mode='markers',
            name='Data points',
            marker=dict(size=6, opacity=0.6)
        ))
        
        # Add reference line
        line_min = min(theoretical_quantiles.min(), sorted_data.min())
        line_max = max(theoretical_quantiles.max(), sorted_data.max())
        fig.add_trace(go.Scatter(
            x=[line_min, line_max],
            y=[line_min, line_max],
            mode='lines',
            name='Reference line',
            line=dict(color='red', dash='dash')
        ))
        
        fig.update_layout(
            title=f'Q-Q Plot for {column_name}',
            xaxis_title='Theoretical Quantiles',
            yaxis_title='Sample Quantiles'
        )
        
        return fig
    
    def _create_pairplot(self, df: pd.DataFrame, session_id: str) -> str:
        """Create pairplot using matplotlib/seaborn"""
        fig, axes = plt.subplots(len(df.columns), len(df.columns), 
                                figsize=(15, 15))
        
        for i, col1 in enumerate(df.columns):
            for j, col2 in enumerate(df.columns):
                if i == j:
                    # Diagonal: histogram
                    axes[i, j].hist(df[col1].dropna(), bins=30, alpha=0.7)
                    axes[i, j].set_title(f'{col1}')
                else:
                    # Off-diagonal: scatter plot
                    axes[i, j].scatter(df[col2], df[col1], alpha=0.6)
                    axes[i, j].set_xlabel(col2)
                    axes[i, j].set_ylabel(col1)
        
        plt.tight_layout()
        
        # Save plot
        plot_path = f"static/plots/{session_id}_pairplot.png"
        plt.savefig(plot_path, dpi=300, bbox_inches='tight')
        plt.close()
        
        return plot_path
    
    def _create_stats_comparison(self, original_series: pd.Series, 
                               transformed_series: pd.Series, 
                               column: str, session_id: str) -> dict:
        """Create statistics comparison visualization"""
        stats_data = {
            'Metric': ['Mean', 'Median', 'Std Dev', 'Skewness', 'Kurtosis'],
            'Before': [
                original_series.mean(),
                original_series.median(),
                original_series.std(),
                original_series.skew(),
                original_series.kurtosis()
            ],
            'After': [
                transformed_series.mean(),
                transformed_series.median(),
                transformed_series.std(),
                transformed_series.skew(),
                transformed_series.kurtosis()
            ]
        }
        
        fig = go.Figure(data=[
            go.Bar(name='Before', x=stats_data['Metric'], y=stats_data['Before']),
            go.Bar(name='After', x=stats_data['Metric'], y=stats_data['After'])
        ])
        
        fig.update_layout(
            title=f'Statistics Comparison: {column}',
            xaxis_title='Metrics',
            yaxis_title='Values',
            barmode='group'
        )
        
        return {'stats_comparison': self._save_plotly_figure(fig, f"{session_id}_{column}_stats_comp")}
    
    def _save_plotly_figure(self, fig: go.Figure, filename: str) -> str:
        """Save plotly figure and return path"""
        plot_path = f"static/plots/{filename}.html"
        fig.write_html(plot_path)
        return plot_path
    
    def _save_matplotlib_figure(self, fig, filename: str) -> str:
        """Save matplotlib figure and return path"""
        plot_path = f"static/plots/{filename}.png"
        fig.savefig(plot_path, dpi=300, bbox_inches='tight')
        plt.close(fig)
        return plot_path